import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  MdAddCircleOutline,
  MdBookmark,
  MdCheckCircle,
  MdDelete,
  MdRadioButtonUnchecked,
  MdSort
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as yup from "yup";

import { ReactComponent as ClipboardImg } from "../../assets/clipboard.svg";
import { Header } from "../../components/global/Header";
import { LoadingPage } from "../../components/global/LoadingPage";
import { Pagination } from "../../components/global/Pagination";
import { SideMenu } from "../../components/global/SideMenu";
import { api } from "../../services/api";
import {
  Actions,
  Button,
  Categories,
  Container,
  Count,
  Counters,
  Empty,
  Form,
  Item,
  List,
  TextNoThrough,
  TextThrough
} from "./styles";

interface Task {
  id: string;
  description: string;
  user_id: string;
  attachment: boolean;
  category_id: number;
  is_finished: boolean;
}

interface Pagination {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

interface TaskSummary {
  finished: number
  unfinished: number
}

interface ListTask {
  items: Task[];
  meta: Pagination;
  summary: TaskSummary;
}

interface UpdateTask {
  id: string;
  description?: string;
  attachment?: boolean;
  category_id?: number;
  is_finished?: boolean;
}

interface CreateTaskFormData {
  description: string;
};

const createTaskFormSchema = yup.object().shape({
  description: yup.string().required("Descrição obrigatório"),
});

export function TodoList() {
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [tasksFinished, setTasksFinished] = useState(0);
  const [tasksNotFinished, setTasksNotFinished] = useState(0);
  const [taskAddCategory, setTaskAddCategory] = useState(false);
  const [categoryIsEdit, setCategoryIsEdit] = useState("");
  const [order, setOrder] = useState(1);
  const [loadingPage, setLoadingPage] = useState(false);
  const [tasksListPagination, setTasksListPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);

  const { reset,register,handleSubmit,formState: { errors } } = useForm<CreateTaskFormData>({
    resolver: yupResolver(createTaskFormSchema),
  });

  const navigate = useNavigate();
  const defaultLimitData = import.meta.env.VITE_PAGINATION_LIMIT;

  const handleTaskCreate: SubmitHandler<CreateTaskFormData> = async (
    values
  ) => {
    const token = localStorage.getItem("@ToDoList:token");

    if (!token) {
      localStorage.clear();
      navigate("/");
    } else {
      await api.post("tasks", values, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        if (response.status === 201)
          reset();

          toast("Task criada com sucesso!", {
            position: "top-right",
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            progress: undefined,
            theme: "light",
            type: "info",
          });
      })
      .catch((error) => {
        if (error.response?.status === 401) {
          toast("A sessão expirou, faça o login novamente.", {
            position: "top-right",
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            progress: undefined,
            theme: "light",
            type: "error",
          });

          localStorage.clear();
          navigate("/");
        } else {
          console.error(error);

          toast("Erro ao criar a task, contate o administrador.!", {
            position: "top-right",
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            progress: undefined,
            theme: "light",
            type: "error",
          });
        }
      });

      await getListTasks(token);
    }
  };

  const handleTaskUpdate = async ({
    id,
    description,
    attachment,
    category_id,
    is_finished
  }: UpdateTask,
    currentTask?: number
  ) => {
    const token = localStorage.getItem("@ToDoList:token");

    if (!token) {
      localStorage.clear();
      navigate("/");
    } else {
      let data;
      const descriptionUpdate = { description };
      const attachmentUpdate = { attachment };
      const statusUpdate = { is_finished };
      const categoryUpdate = {
        category_id: category_id === Number(currentTask) ? null : category_id
      };

      if (
        is_finished === undefined &&
        category_id === undefined &&
        attachment === undefined
      ) {
        data = descriptionUpdate;
      }

      if (
        description === undefined &&
        is_finished === undefined &&
        attachment === undefined
      ) {
        data = categoryUpdate;
      }

      if (
        description === undefined &&
        category_id === undefined &&
        attachment === undefined
      ) {
        data = statusUpdate;
      }

      if (
        description === undefined &&
        category_id === undefined &&
        is_finished === undefined
      ) {
        data = attachmentUpdate;
      }

      await api.patch(`tasks/${id}`, data, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
      })
      .then((response) => {
        if (response.status === 200)
          toast("Task atualizada com sucesso!", {
            position: "top-right",
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            progress: undefined,
            theme: "light",
            type: "info",
          });
      })
      .catch((error) => {
        if (error.response?.status === 401) {
          toast("A sessão expirou, faça o login novamente.", {
            position: "top-right",
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            progress: undefined,
            theme: "light",
            type: "error",
          });

          localStorage.clear();
          navigate("/");
        } else {
          console.error(error);

          toast("Erro ao atualizar a task, contate o administrador.!", {
            position: "top-right",
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            progress: undefined,
            theme: "light",
            type: "error",
          });
        }
      });

      await getListTasks(token);
    }
  };

  const handleTaskRemove = async (id: string) => {
    const token = localStorage.getItem("@ToDoList:token");

    if (!token) {
      localStorage.clear();
      navigate("/");
    } else {
      await api.delete(`tasks/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
      })
      .then((response) => {
        if (response.status === 200)
          toast("Task removida com sucesso!", {
            position: "top-right",
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            progress: undefined,
            theme: "light",
            type: "info",
          });
      })
      .catch((error) => {
        if (error.response?.status === 401) {
          toast("A sessão expirou, faça o login novamente.", {
            position: "top-right",
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            progress: undefined,
            theme: "light",
            type: "error",
          });

          localStorage.clear();
          navigate("/");
        } else {
          console.error(error);

          toast("Erro ao remover a task, contate o administrador.!", {
            position: "top-right",
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            progress: undefined,
            theme: "light",
            type: "error",
          });
        }
      });

      await getListTasks(token);
    }
  };

  const handleTasksOrder = async () => {
    setOrder(-order);

    tasksList.sort((a, b) => {
      return a.is_finished < b.is_finished ? -order : order;
    });
  }

  // const handleTaskAttachment = async (id: string, file: any) => {
  //   if (file.length > 0) {
  //     const formData = new FormData();
  //     formData.append("file", file[0]);

  //     const token = localStorage.getItem("@ToDoList:token");

  //     if (!token) {
  //       localStorage.clear();
  //       navigate("/");
  //     } else {
  //       await api.post(`tasks/upload?task_id=${id}`, formData, {
  //         headers: {
  //           "Authorization": `Bearer ${token}`,
  //           "Content-Type": "multipart/form-data",
  //         },
  //       })
  //       .then((response) => {
  //         if (response.status === 201)
  //           toast("Arquivo anexado com sucesso!", {
  //             position: "top-right",
  //             autoClose: 8000,
  //             hideProgressBar: false,
  //             closeOnClick: true,
  //             pauseOnHover: false,
  //             draggable: false,
  //             progress: undefined,
  //             theme: "light",
  //             type: "info",
  //           });
  //       })
  //       .catch((error) => {
  //         if (error.response?.status === 401) {
  //           toast("A sessão expirou, faça o login novamente.", {
  //             position: "top-right",
  //             autoClose: 8000,
  //             hideProgressBar: false,
  //             closeOnClick: true,
  //             pauseOnHover: false,
  //             draggable: false,
  //             progress: undefined,
  //             theme: "light",
  //             type: "error",
  //           });

  //           localStorage.clear();
  //           navigate("/");
  //         } else {
  //           console.error(error);

  //           toast("Erro ao anexar o arquivo, contate o administrador.!", {
  //             position: "top-right",
  //             autoClose: 8000,
  //             hideProgressBar: false,
  //             closeOnClick: true,
  //             pauseOnHover: false,
  //             draggable: false,
  //             progress: undefined,
  //             theme: "light",
  //             type: "error",
  //           });
  //         }
  //       });

  //       await handleTaskUpdate({ id, attachment: true });
  //       await getListTasks(token);
  //     }
  //   }
  // };

  const handleTaskCategory = async (id: string, currentCategory: number, value: string) => {
    handleTaskUpdate({ id, category_id: Number(value) }, currentCategory);
    setTaskAddCategory(false);
  };

  // const handleLogout = () => {
  //   localStorage.removeItem("@ToDoList:token");
  //   navigate("/");
  // };

  async function getListTasks(token: string) {
    await api.get(`tasks?page=${page}&limit=${defaultLimitData}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response) => {
      const tasks: ListTask = response.data;
      setTasksList(tasks.items);
      setTasksListPagination(tasks.meta)

      localStorage.setItem("@ToDoList:tasksList", JSON.stringify(tasks));

      const filterTasksFinished = tasks.summary.finished;
      const filterTasksNotFinished = tasks.summary.unfinished;

      setTasksFinished(filterTasksFinished);
      setTasksNotFinished(filterTasksNotFinished);
    })
    .catch((error) => {
      if (error.response?.status === 401) {
        toast("A sessão expirou, faça o login novamente.", {
          position: "top-right",
          autoClose: 8000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: false,
          progress: undefined,
          theme: "light",
          type: "error",
        });

        localStorage.clear();
        navigate("/");
      } else {
        console.error(error);

        toast("Erro ao buscar as tasks, contate o administrador.!", {
          position: "top-right",
          autoClose: 8000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: false,
          progress: undefined,
          theme: "light",
          type: "error",
        });
      }
    });
  }

  useEffect(() => {
    const token = localStorage.getItem("@ToDoList:token");

    if (!token) {
      localStorage.clear()
      navigate("/")
    } else {
      getListTasks(token)
    }
  }, [page])

  useEffect(() => {
    setLoadingPage(true)
    const token = localStorage.getItem("@ToDoList:token");

    if (!token) {
      localStorage.clear();
      navigate("/");
    } else {
      getListTasks(token);

      setTimeout(() => {
        setLoadingPage(false)
      }, 2000)
    }
  }, []);

  return (
    <>
      { loadingPage
        ?
            <LoadingPage />
        :
          <>
            <Header />

            <Container>
              <ToastContainer
                position="top-right"
                autoClose={8000}
                hideProgressBar
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss={false}
                draggable={false}
                pauseOnHover={false}
                theme="light"
              />

              <Form onSubmit={handleSubmit(handleTaskCreate)}>
                <input
                  type="text"
                  placeholder="Adicione uma nova tarefa"
                  {...register("description")}
                />

                <Button type="submit">
                  Criar
                  <MdAddCircleOutline size={18} style={{ fill: "var(--shape)" }} />
                </Button>
              </Form>
              <p className="error-msg">{errors.description?.message}</p>

              <Counters>
                <div className="resumeTasks">
                  <Count finished={false}>
                    <p>Pendentes</p>
                    <span>{tasksNotFinished}</span>
                  </Count>

                  <Count finished={true}>
                    <p>Concluídas</p>
                    <span>{tasksFinished}</span>
                  </Count>
                </div>

                <div
                  title="Reordernar"
                  className="sortIcon"
                  onClick={() => handleTasksOrder()}
                >
                  <MdSort />
                </div>
              </Counters>

              <List>
                {tasksList.length < 1 ? (
                  <Empty>
                    <ClipboardImg id="clipboard" />

                    <span> Você ainda não tem tarefas cadastradas</span>
                    <p>Crie tarefas e organize seus itens a fazer</p>
                  </Empty>
                ) : (
                  <>
                    {tasksList.map((task) =>
                      task.is_finished ? (
                        <Item key={task.id}>
                          <div
                            className="checked"
                            onClick={() =>
                              handleTaskUpdate({ id: task.id, is_finished: !task.is_finished})
                            }
                          >
                            <MdCheckCircle />
                          </div>

                          <TextThrough>{task.description}</TextThrough>

                          <Actions>
                            <div
                              title="Remover"
                              className="trashIcon"
                              onClick={() => handleTaskRemove(task.id)}
                            >
                              <MdDelete />
                            </div>
                          </Actions>
                        </Item>
                      ) : (
                        <Item
                          key={task.id}
                          category={Number(task.category_id)}
                        >
                          <div
                            className="no-checked"
                            onClick={() =>
                              handleTaskUpdate({id: task.id, is_finished: !task.is_finished})
                            }
                          >
                            <MdRadioButtonUnchecked />
                          </div>

                          <TextNoThrough>{task.description}</TextNoThrough>

                          <Actions attachment={task.attachment}>
                            {/* <div
                              title="Anexar"
                              className="attachmentIcon"
                            >
                              {task.attachment
                                ?
                                  <a href={`http://localhost:3333/api/v1/tasks/download/${task.id}`} target="_blank">
                                    <MdAttachFile />
                                  </a>
                                :
                                  <>
                                    <label htmlFor="attachment">
                                      <MdAttachFile />
                                    </label>

                                    <input
                                      type="file"
                                      id="attachment"
                                      name="attachment"
                                      accept="application/pdf"
                                      onChange={(e) =>
                                        handleTaskAttachment(task.id, e.target.files)
                                      }
                                    />
                                  </>
                              }
                            </div> */}

                            <div
                              title="Categorizar"
                              className="categoryIcon"
                              onClick={() => {
                                setTaskAddCategory((current) => !current);
                                setCategoryIsEdit(task.id);
                              }}
                            >
                              <MdBookmark />
                            </div>

                            <div
                              title="Remover"
                              className="trashIcon"
                              onClick={() => handleTaskRemove(task.id)}
                            >
                              <MdDelete />
                            </div>

                            {taskAddCategory && task.id === categoryIsEdit && (
                              <Categories>
                                <button
                                  className="high"
                                  value="3"
                                  onClick={(e) =>
                                    handleTaskCategory(
                                      task.id,
                                      task.category_id,
                                      (e.target as HTMLButtonElement).value
                                    )
                                  }
                                >Alta</button>

                                <button
                                  className="average"
                                  value="2"
                                  onClick={(e) =>
                                    handleTaskCategory(
                                      task.id,
                                      task.category_id,
                                      (e.target as HTMLButtonElement).value
                                    )
                                  }
                                >Média</button>

                                <button
                                  className="low"
                                  value="1"
                                  onClick={(e) =>
                                    handleTaskCategory(
                                      task.id,
                                      task.category_id,
                                      (e.target as HTMLButtonElement).value
                                    )
                                  }
                                >Baixa</button>
                              </Categories>
                            )}
                          </Actions>
                        </Item>
                      )
                    )}
                  </>
                )}
              </List>

              {
                tasksListPagination && tasksListPagination.totalPages > 1 &&
                  <Pagination
                    totalCountOfRegisters={tasksListPagination.totalItems}
                    registersPerPage={tasksListPagination.itemsPerPage}
                    currentPage={tasksListPagination.currentPage}
                    onPageChange={setPage}
                  />
              }
            </Container>
          </>
      }
      <SideMenu />
    </>
  );
}

